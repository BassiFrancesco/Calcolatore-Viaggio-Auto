/* ========================================================================
   Logica del calcolatore
   ======================================================================== */

(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const euro = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  });
  const number = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
  const profileStorageKey = "calcolatore-costo-viaggio-profili-v1";
  const fuelPriceStorageKey = "calcolatore-costo-viaggio-prezzi-carburante-v1";

  let vehicleType = "auto";
  let stops = [];
  let chart;
  let selectedAciVehicle;
  let latestCalculation;

  const normalized = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

  const toNumber = (value) => {
    const parsed = Number.parseFloat(String(value || "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getProfiles = () => {
    try {
      const profiles = JSON.parse(localStorage.getItem(profileStorageKey) || "[]");
      return Array.isArray(profiles) ? profiles : [];
    } catch {
      return [];
    }
  };

  const saveProfiles = (profiles) => localStorage.setItem(profileStorageKey, JSON.stringify(profiles));

  const getSavedFuelPrices = () => {
    try {
      const prices = JSON.parse(localStorage.getItem(fuelPriceStorageKey) || "{}");
      return prices && typeof prices === "object" ? prices : {};
    } catch {
      return {};
    }
  };

  const saveFuelPrice = (fuel, price) => {
    if (price <= 0) return;
    const prices = getSavedFuelPrices();
    prices[fuel] = price;
    localStorage.setItem(fuelPriceStorageKey, JSON.stringify(prices));
  };

  const fuelName = (fuel) => ({
    benzina: "benzina",
    diesel: "diesel",
    gpl: "GPL",
    metano: "metano",
    elettrico: "energia elettrica",
  }[fuel] || "carburante");

  const setStatus = (id, message) => {
    const element = $(id);
    element.textContent = message;
    element.style.display = "block";
  };

  const formatHours = (hours) => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h} h ${String(m).padStart(2, "0")} min`;
  };

  function currentTechnicalVehicles() {
    return VEHICLE_DB.filter((vehicle) => vehicle.type === vehicleType);
  }

  function currentSearchVehicles() {
    if (vehicleType === "auto") {
      return [...ACI_2026_DB, ...getProfiles().filter((profile) => profile.type === "auto")];
    }
    return [...currentTechnicalVehicles(), ...getProfiles().filter((profile) => profile.type === "camion")];
  }

  function fillDatalist() {
    const list = $("#vehicleDatalist");
    list.replaceChildren();
    const fragment = document.createDocumentFragment();
    currentSearchVehicles().forEach((vehicle) => {
      const option = document.createElement("option");
      option.value = vehicle.name;
      const engine = vehicle.hp ? `${vehicle.disp || "—"} · ${vehicle.hp} CV` : vehicle.disp || "—";
      option.label = vehicle.aciCostPerKm
        ? `${engine} · ACI ${vehicle.aciCostPerKm.toFixed(4)} €/km`
        : engine;
      fragment.append(option);
    });
    list.append(fragment);
  }

  function fillCategories() {
    const select = $("#categorySelect");
    const categories = vehicleType === "auto" ? AUTO_CATEGORIES : CAMION_CATEGORIES;
    select.replaceChildren();
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.label;
      select.append(option);
    });
  }

  function selectedCategory() {
    const categories = vehicleType === "auto" ? AUTO_CATEGORIES : CAMION_CATEGORIES;
    return categories.find((category) => category.id === $("#categorySelect").value);
  }

  function inferModelYear(name) {
    const years = String(name || "").match(/\b(?:19|20)\d{2}\b/g);
    return years?.at(-1) || "";
  }

  function categoryForData({ fuel, hp, name = "", section = "" }) {
    const categories = vehicleType === "auto" ? AUTO_CATEGORIES : CAMION_CATEGORIES;
    const source = normalized(`${name} ${section}`);
    if (vehicleType === "auto" && (fuel === "elettrico" || source.includes("ELETTR"))) {
      return categories.find((category) => category.id === "elettrica");
    }
    if (vehicleType === "auto" && (source.includes("IBRID") || source.includes("HYBRID"))) {
      return categories.find((category) => category.id === "ibrida");
    }
    const compatible = categories.filter((category) => category.fuel === fuel);
    if (!compatible.length) return categories[0];
    if (!hp) return compatible[0];
    return compatible.reduce((closest, category) =>
      Math.abs(category.hp - hp) < Math.abs(closest.hp - hp) ? category : closest
    );
  }

  function syncCategoryForData(data) {
    const category = categoryForData(data);
    if (category) $("#categorySelect").value = category.id;
  }

  function syncCategoryFromForm() {
    syncCategoryForData({
      fuel: $("#fuelType").value,
      hp: toNumber($("#hp").value),
      name: $("#vehicleSearch").value,
    });
  }

  function applyCategory() {
    const category = selectedCategory();
    if (!category) return;
    $("#fuelType").value = category.fuel;
    $("#displacement").value = category.disp;
    $("#hp").value = category.hp;
    $("#vehicleYear").value = "";
    $("#consumption").value = category.cons;
    $("#consumptionUnit").value = "per100";
    $("#vehicleSearch").value = "";
    clearMatches();
    updateFuelPresentation(true);
    calculate();
  }

  function clearMatches() {
    $("#vehicleMatches").replaceChildren();
  }

  function vehicleSearchMatches(query) {
    const tokens = normalized(query).split(" ").filter((token) => token.length > 1);
    if (!tokens.length) return [];
    return currentSearchVehicles()
      .filter((vehicle) => {
        const searchable = normalized(`${vehicle.name} ${vehicle.fuel} ${vehicle.hp || ""}`);
        return tokens.every((token) => searchable.includes(token));
      })
      .slice(0, 8);
  }

  function renderMatches() {
    const query = $("#vehicleSearch").value;
    const container = $("#vehicleMatches");
    container.replaceChildren();
    if (query.trim().length < 2) return;

    const matches = vehicleSearchMatches(query);
    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "vehicle-empty";
      empty.textContent = "Nessuna versione trovata: usa i dati manuali o scegli una categoria generica.";
      container.append(empty);
      return;
    }

    matches.forEach((vehicle) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "vehicle-match";
      const engine = vehicle.hp ? `${vehicle.disp || "—"} · ${vehicle.hp} CV` : vehicle.disp || "—";
      const kind = vehicle.aciCostPerKm
        ? `ACI 2026 · ${vehicle.inProduction ? "in produzione" : "fuori produzione"}`
        : "Dati tecnici locali";
      button.innerHTML = `<span><span class="vehicle-name"></span><span class="vehicle-meta"></span></span><span class="vehicle-cost"></span>`;
      button.querySelector(".vehicle-name").textContent = vehicle.name;
      button.querySelector(".vehicle-meta").textContent = `${engine} · ${vehicle.fuel} · ${kind}`;
      button.querySelector(".vehicle-cost").textContent = vehicle.aciCostPerKm
        ? `${vehicle.aciCostPerKm.toFixed(4)} €/km`
        : "Seleziona";
      button.addEventListener("click", () => applyVehicle(vehicle));
      container.append(button);
    });
  }

  function findTechnicalConsumption(vehicle) {
    const vehicleTokens = new Set(normalized(vehicle.name).split(" ").filter((token) => token.length > 2));
    let best;
    let bestScore = 0;
    TECHNICAL_VEHICLE_DB.filter((candidate) => candidate.type === "auto" && candidate.fuel === vehicle.fuel)
      .forEach((candidate) => {
        const tokens = normalized(candidate.name).split(" ").filter((token) => token.length > 2);
        const score = tokens.filter((token) => vehicleTokens.has(token)).length;
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      });
    return bestScore >= 2 ? best : undefined;
  }

  function setAciMode() {
    $("#rc-aci input").checked = true;
    $("#rc-manual").classList.remove("selected");
    $("#rc-aci").classList.add("selected");
    $("#vc-manual-fields").style.display = "none";
    $("#vc-aci-fields").style.display = "block";
  }

  function updateAciReference() {
    const reference = $("#manualAciReference");
    const hint = $("#manualAciReferenceHint");
    const cost = selectedAciVehicle?.aciCostPerKm || toNumber($("#aciCostPerKm").value);
    if (!cost) {
      reference.value = "";
      hint.textContent = "I campi manuali restano modificabili; il riferimento ACI è mostrato per confronto.";
      return;
    }
    const vehicleName = selectedAciVehicle?.name || $("#vehicleSearch").value || "Versione selezionata";
    reference.value = `${vehicleName} - ${cost.toFixed(4)} €/km`;
    hint.textContent = "Tabella ACI 2026, percorrenza convenzionale 15.000 km/anno. Il valore è solo un riferimento: il calcolo manuale usa i campi qui sopra.";
  }

  function applyVehicle(vehicle) {
    $("#vehicleSearch").value = vehicle.name;
    $("#fuelType").value = vehicle.fuel || "benzina";
    $("#vehicleYear").value = vehicle.year || inferModelYear(vehicle.name);
    $("#displacement").value = vehicle.disp || "—";
    $("#hp").value = vehicle.hp || "";
    $("#consumptionUnit").value = vehicle.consumptionUnit || "per100";
    syncCategoryForData({
      fuel: vehicle.fuel,
      hp: vehicle.hp,
      name: vehicle.name,
      section: vehicle.aciSection,
    });

    const technicalMatch = vehicle.cons != null ? vehicle : findTechnicalConsumption(vehicle);
    if (technicalMatch?.cons != null) {
      $("#consumption").value = technicalMatch.cons;
    }

    if (vehicle.aciCostPerKm) {
      selectedAciVehicle = vehicle;
      $("#aciCostPerKm").value = vehicle.aciCostPerKm.toFixed(4);
      $("#vehicleCostEnabled").checked = true;
      if (!$("#annualKm").value) $("#annualKm").value = 15000;
      setAciMode();
      const consumptionNote = technicalMatch?.cons != null
        ? ` Consumo tecnico iniziale: ${technicalMatch.cons} per 100 km; puoi correggerlo.`
        : " Il consumo non è riportato dalla tabella ACI: inseriscilo se vuoi calcolare separatamente il carburante.";
      $("#vehicleSearchHint").textContent = `Versione ACI 2026 applicata: ${vehicle.disp || "—"}, ${vehicle.hp ? `${vehicle.hp} CV` : "CV non indicati"}, costo ${vehicle.aciCostPerKm.toFixed(4)} €/km.${consumptionNote}`;
    } else {
      selectedAciVehicle = undefined;
      $("#vehicleSearchHint").textContent = "Dati tecnici applicati. Inserisci il costo/km ACI se disponibile.";
    }

    clearMatches();
    updateAciReference();
    updateFuelPresentation(true);
    syncModules();
    calculate();
  }

  function switchVehicleType(type) {
    vehicleType = type;
    $$("#vehicleTypeSeg button").forEach((button) => button.classList.toggle("active", button.dataset.val === type));
    $("#loadPctField").style.display = type === "camion" ? "block" : "none";
    $("#rc-aci").style.display = type === "auto" ? "flex" : "none";
    if (type === "camion" && $("#rc-aci input").checked) {
      $("#rc-manual input").checked = true;
      setVehicleCostMode();
    }
    $("#vehicleSearch").value = "";
    $("#vehicleSearchHint").textContent = type === "auto"
      ? `Cerca tra le ${ACI_2026_METADATA.entries.toLocaleString("it-IT")} versioni auto ACI 2026.`
      : "Per i camion sono disponibili i dati tecnici locali: il costo ACI non è incluso nell'archivio auto.";
    clearMatches();
    fillDatalist();
    fillCategories();
    applyCategory();
  }

  function stopTemplate(index, kind) {
    const wrapper = document.createElement("div");
    wrapper.className = "stop-row";
    wrapper.dataset.stopIndex = index;
    const title = kind === "partenza" ? "Partenza" : kind === "arrivo" ? "Arrivo" : `Tappa ${index}`;
    const distanceField = kind === "partenza"
      ? "<div aria-hidden=\"true\"></div>"
      : "<div><div class=\"stop-num\">Km dalla tappa precedente</div><input class=\"stop-km\" type=\"number\" min=\"0\" step=\"0.1\" placeholder=\"es. 25\"></div>";
    wrapper.innerHTML = `
      <div><div class="stop-num">${title}</div><input class="stop-place" type="text" placeholder="Città o indirizzo (facoltativo)"></div>
      ${distanceField}
      <div><div class="stop-num">Tempo extra (ore)</div><input class="stop-extra" type="number" min="0" step="0.1" value="0"></div>
      <button type="button" class="rm" title="Rimuovi tappa" ${kind === "intermedia" ? "" : "hidden"}>×</button>`;
    wrapper.querySelectorAll("input").forEach((input) => input.addEventListener("input", calculate));
    wrapper.querySelector(".rm").addEventListener("click", () => {
      stops = stops.filter((stop) => stop !== wrapper);
      wrapper.remove();
      refreshStopLabels();
      calculate();
    });
    return wrapper;
  }

  function refreshStopLabels() {
    stops.forEach((stop, index) => {
      const label = index === 0 ? "Partenza" : index === stops.length - 1 ? "Arrivo" : `Tappa ${index}`;
      stop.querySelector(".stop-num").textContent = label;
      stop.querySelector(".rm").hidden = index === 0 || index === stops.length - 1;
    });
  }

  function addInitialStops() {
    const container = $("#stopsContainer");
    const start = stopTemplate(0, "partenza");
    const end = stopTemplate(1, "arrivo");
    stops = [start, end];
    container.append(start, end);
  }

  function addIntermediateStop() {
    const stop = stopTemplate(stops.length - 1, "intermedia");
    stops.splice(stops.length - 1, 0, stop);
    $("#stopsContainer").insertBefore(stop, stops[stops.length - 1]);
    refreshStopLabels();
  }

  function routeData() {
    const oneWayKm = stops.reduce((sum, stop) => sum + toNumber(stop.querySelector(".stop-km")?.value), 0);
    const extraHours = stops.reduce((sum, stop) => sum + toNumber(stop.querySelector(".stop-extra").value), 0);
    const multiplier = $("#roundTrip").checked ? 2 : 1;
    return { oneWayKm, totalKm: oneWayKm * multiplier, extraHours: extraHours * multiplier };
  }

  function updateFuelPresentation(resetPrice = false) {
    const fuel = $("#fuelType").value;
    const unit = FUEL_LABEL_UNIT[fuel] || "unità";
    const savedPrices = getSavedFuelPrices();
    const lastPrice = savedPrices[fuel];
    $("#fuelNameLabel").textContent = fuelName(fuel);
    $("#fuelPriceUnitLabel").textContent = `€/${unit}`;
    $("#fuelPriceHint").textContent = lastPrice
      ? `Ultimo prezzo ${fuelName(fuel)} salvato: ${euro.format(lastPrice)} per ${unit}. Puoi modificarlo liberamente.`
      : `Valore iniziale ${fuelName(fuel)}: ${FUEL_DEFAULTS_DATE}. Verrà salvato l'ultimo valore che inserisci.`;
    if (resetPrice || !$("#fuelPrice").value) $("#fuelPrice").value = lastPrice || FUEL_DEFAULTS[fuel] || "";
  }

  function setVehicleCostMode() {
    const isAci = $("input[name='vcMode']:checked").value === "aci";
    $("#rc-manual").classList.toggle("selected", !isAci);
    $("#rc-aci").classList.toggle("selected", isAci);
    $("#vc-manual-fields").style.display = isAci ? "none" : "block";
    $("#vc-aci-fields").style.display = isAci ? "block" : "none";
    if (!isAci && selectedAciVehicle && !$("#annualKm").value) $("#annualKm").value = 15000;
    updateAciReference();
    calculate();
  }

  function syncModules() {
    [
      ["#mod-fuel", "#fuelEnabled"],
      ["#mod-vehicleCost", "#vehicleCostEnabled"],
      ["#mod-driver", "#driverEnabled"],
      ["#mod-tolls", "#tollsEnabled"],
    ].forEach(([module, input]) => $(module).classList.toggle("disabled", !$(input).checked));
  }

  function calculate() {
    const { totalKm, extraHours } = routeData();
    const fuelEnabled = $("#fuelEnabled").checked;
    const consumption = toNumber($("#consumption").value);
    const consumptionUnit = $("#consumptionUnit").value;
    const loadMultiplier = vehicleType === "camion" ? 1 + (toNumber($("#loadPct").value) / 100) : 1;
    const fuelPrice = toNumber($("#fuelPrice").value);
    const fuelAmount = consumptionUnit === "kml" && consumption > 0
      ? totalKm / consumption
      : totalKm * (consumption * loadMultiplier) / 100;
    const fuelCost = fuelEnabled ? fuelAmount * fuelPrice : 0;
    const fuelCostPerKm = totalKm > 0 ? fuelCost / totalKm : 0;

    let vehicleCost = 0;
    let vehicleDescription = "";
    const aciMode = $("input[name='vcMode']:checked").value === "aci";
    if ($("#vehicleCostEnabled").checked && aciMode) {
      const aciCost = toNumber($("#aciCostPerKm").value);
      if ($("#aciSubtractFuel").checked && fuelEnabled) {
        vehicleCost = Math.max(0, aciCost - fuelCostPerKm) * totalKm;
        vehicleDescription = `ACI ${aciCost.toFixed(4)} €/km, quota carburante scorporata`;
      } else {
        vehicleCost = aciCost * totalKm;
        vehicleDescription = `ACI ${aciCost.toFixed(4)} €/km tutto incluso`;
      }
    } else if ($("#vehicleCostEnabled").checked) {
      const value = toNumber($("#vehicleValue").value);
      const residual = toNumber($("#residualValue").value);
      const lifeKm = toNumber($("#usefulLifeKm").value);
      const annualKm = toNumber($("#annualKm").value);
      const annualCosts = toNumber($("#maintenanceAnnual").value) + toNumber($("#insuranceAnnual").value);
      const depreciationPerKm = lifeKm > 0 ? Math.max(0, value - residual) / lifeKm : 0;
      const annualPerKm = annualKm > 0 ? annualCosts / annualKm : 0;
      vehicleCost = totalKm * (depreciationPerKm + annualPerKm);
      vehicleDescription = "ammortamento, manutenzione e assicurazione";
    }

    const speed = toNumber($("#avgSpeed").value);
    const automaticHours = speed > 0 ? totalKm / speed + extraHours : extraHours;
    $("#suggestedTime").value = formatHours(automaticHours);
    const driverHours = toNumber($("#manualHoursOverride").value) || automaticHours;
    const driverCost = $("#driverEnabled").checked ? driverHours * toNumber($("#hourlyRate").value) : 0;
    const tollsCost = $("#tollsEnabled").checked ? toNumber($("#tollsAmount").value) : 0;
    const total = fuelCost + vehicleCost + driverCost + tollsCost;

    $("#totalCost").textContent = euro.format(total);
    $("#costPerKm").textContent = euro.format(totalKm > 0 ? total / totalKm : 0);
    $("#totalKmDisplay").textContent = number.format(totalKm);

    const items = [
      { label: "Carburante", amount: fuelCost, color: "#f59e0b", visible: fuelEnabled },
      { label: "Mezzo", amount: vehicleCost, color: "#2563eb", visible: $("#vehicleCostEnabled").checked },
      { label: "Conducente", amount: driverCost, color: "#0891b2", visible: $("#driverEnabled").checked },
      { label: "Pedaggi", amount: tollsCost, color: "#15803d", visible: $("#tollsEnabled").checked },
    ].filter((item) => item.visible);

    latestCalculation = {
      totalKm,
      extraHours,
      fuelAmount,
      fuelPrice,
      fuelCost,
      vehicleCost,
      driverCost,
      tollsCost,
      total,
      automaticHours,
      driverHours,
      vehicleDescription,
      aciMode,
      aciCost: toNumber($("#aciCostPerKm").value),
      items,
    };

    $("#breakdownList").replaceChildren(...items.map((item) => {
      const row = document.createElement("div");
      row.className = "breakdown-row";
      row.innerHTML = `<span><i class="dot"></i>${item.label}</span><b></b>`;
      row.querySelector(".dot").style.background = item.color;
      row.querySelector("b").textContent = euro.format(item.amount);
      return row;
    }));

    const formulas = [
      `Distanza totale: ${number.format(totalKm)} km${$("#roundTrip").checked ? " (andata e ritorno)" : ""}.`,
      fuelEnabled ? `Carburante: ${number.format(fuelAmount)} ${FUEL_LABEL_UNIT[$("#fuelType").value] || "unità"} × ${euro.format(fuelPrice)}.` : "Carburante disattivato.",
      $("#vehicleCostEnabled").checked ? `Costo mezzo: ${vehicleDescription || "dati manuali da completare"}.` : "Costo mezzo disattivato.",
      $("#driverEnabled").checked ? `Conducente: ${number.format(driverHours)} ore × ${euro.format(toNumber($("#hourlyRate").value))}.` : "Conducente disattivato.",
    ];
    $("#formulasList").replaceChildren(...formulas.map((text) => {
      const item = document.createElement("div");
      item.className = "f-item";
      item.textContent = text;
      return item;
    }));

    renderChart(items);
  }

  function renderChart(items) {
    if (!window.Chart) return;
    const canvas = $("#chart");
    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: items.map((item) => item.label),
        datasets: [{ data: items.map((item) => item.amount), backgroundColor: items.map((item) => item.color), borderWidth: 0 }],
      },
      options: { plugins: { legend: { position: "bottom" } }, cutout: "68%", animation: false },
    });
  }

  function saveCurrentProfile() {
    const name = $("#profileName").value.trim();
    if (!name) {
      setStatus("#profileStatus", "Scrivi un nome per salvare il veicolo.");
      return;
    }
    const profiles = getProfiles().filter((profile) => profile.name !== name);
    profiles.push({
      name,
      type: vehicleType,
      fuel: $("#fuelType").value,
      year: $("#vehicleYear").value,
      disp: $("#displacement").value,
      hp: toNumber($("#hp").value) || null,
      cons: toNumber($("#consumption").value) || null,
      consumptionUnit: $("#consumptionUnit").value,
      aciCostPerKm: toNumber($("#aciCostPerKm").value) || null,
    });
    saveProfiles(profiles);
    fillDatalist();
    setStatus("#profileStatus", `Veicolo “${name}” salvato su questo browser.`);
  }

  function deleteCurrentProfile() {
    const name = $("#profileName").value.trim();
    const profiles = getProfiles();
    const remaining = profiles.filter((profile) => profile.name !== name);
    if (remaining.length === profiles.length) {
      setStatus("#profileStatus", "Nessun veicolo salvato con questo nome.");
      return;
    }
    saveProfiles(remaining);
    fillDatalist();
    setStatus("#profileStatus", `Veicolo “${name}” eliminato.`);
  }

  function exportProfiles() {
    const blob = new Blob([JSON.stringify(getProfiles(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "veicoli-salvati.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importProfiles(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error("Formato non valido");
        saveProfiles(imported.filter((profile) => profile && profile.name));
        fillDatalist();
        setStatus("#profileStatus", `${imported.length} veicoli importati.`);
      } catch {
        setStatus("#profileStatus", "Il file selezionato non è un archivio veicoli valido.");
      }
    };
    reader.readAsText(file);
  }

  function openMaps() {
    const places = stops.map((stop) => stop.querySelector(".stop-place").value.trim()).filter(Boolean);
    if (places.length < 2) {
      setStatus("#profileStatus", "Inserisci almeno partenza e arrivo per aprire l’itinerario.");
      return;
    }
    window.open(`https://www.google.com/maps/dir/${places.map(encodeURIComponent).join("/")}`, "_blank", "noopener");
  }

  function calculateLifeKm() {
    const years = toNumber($("#expectedYears").value);
    const annualKm = toNumber($("#annualKm").value);
    if (years > 0 && annualKm > 0) {
      $("#usefulLifeKm").value = Math.round(years * annualKm);
      calculate();
    }
  }

  function exportPdf() {
    if (!window.jspdf?.jsPDF) {
      setStatus("#downloadStatus", "L’esportazione PDF non è disponibile senza connessione. Puoi stampare la pagina dal browser.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("Calcolatore Costo Viaggio", 16, 20);
    pdf.setFontSize(11);
    pdf.text(`Costo totale: ${$("#totalCost").textContent}`, 16, 32);
    pdf.text(`Distanza: ${$("#totalKmDisplay").textContent} km`, 16, 40);
    let y = 52;
    $$("#breakdownList .breakdown-row").forEach((row) => {
      pdf.text(`${row.textContent.trim()}`, 16, y);
      y += 8;
    });
    pdf.save("costo-viaggio.pdf");
  }

  function bindEvents() {
    $$("#vehicleTypeSeg button").forEach((button) => button.addEventListener("click", () => switchVehicleType(button.dataset.val)));
    $("#categorySelect").addEventListener("change", applyCategory);
    $("#vehicleSearch").addEventListener("input", () => {
      renderMatches();
      const exact = currentSearchVehicles().find((vehicle) => normalized(vehicle.name) === normalized($("#vehicleSearch").value));
      if (exact) applyVehicle(exact);
    });
    $("#fuelType").addEventListener("change", () => { updateFuelPresentation(true); calculate(); });
    $$("input[name='vcMode']").forEach((input) => input.addEventListener("change", setVehicleCostMode));
    ["#fuelEnabled", "#vehicleCostEnabled", "#driverEnabled", "#tollsEnabled"].forEach((selector) => $(selector).addEventListener("change", () => { syncModules(); calculate(); }));
    $$("input, select").forEach((input) => input.addEventListener("input", calculate));
    $("#btnAddStop").addEventListener("click", addIntermediateStop);
    $("#btnMapsLink").addEventListener("click", openMaps);
    $("#btnCalcLife").addEventListener("click", calculateLifeKm);
    $("#btnSaveProfile").addEventListener("click", saveCurrentProfile);
    $("#btnDeleteProfile").addEventListener("click", deleteCurrentProfile);
    $("#btnExportDb").addEventListener("click", exportProfiles);
    $("#btnImportDb").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", (event) => event.target.files[0] && importProfiles(event.target.files[0]));
    $("#btnExportPdf").addEventListener("click", exportPdf);
  }

  function initialise() {
    if (!Array.isArray(ACI_2026_DB) || !Array.isArray(VEHICLE_DB)) return;
    addInitialStops();
    fillDatalist();
    fillCategories();
    $("#usefulLifeHint").textContent = "In alternativa, inserisci anni e km annui e usa il pulsante di calcolo.";
    $("#vehicleSearchHint").textContent = `Cerca tra le ${ACI_2026_METADATA.entries.toLocaleString("it-IT")} versioni auto ACI 2026 e seleziona motore e CV.`;
    updateFuelPresentation();
    syncModules();
    bindEvents();
    calculate();
  }

  initialise();
})();
