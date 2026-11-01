const compareForm = document.querySelector("#compare-form");
const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const moneyPrecise = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const energyProfiles = {
  benziner: { consumption: 7, energyPrice: 1.8, consumptionLabel: "Verbrauch", consumptionUnit: "l / 100 km", priceLabel: "Preis je Liter", priceUnit: "€ / l" },
  diesel: { consumption: 5.5, energyPrice: 1.7, consumptionLabel: "Verbrauch", consumptionUnit: "l / 100 km", priceLabel: "Preis je Liter", priceUnit: "€ / l" },
  elektro: { consumption: 18, energyPrice: 0.32, consumptionLabel: "Stromverbrauch", consumptionUnit: "kWh / 100 km", priceLabel: "Preis je kWh", priceUnit: "€ / kWh" },
};

function value(id) {
  return Number(document.getElementById(id).value);
}

function interestCost(principal, annualRate, months) {
  if (principal <= 0 || annualRate <= 0 || months <= 0) return 0;
  const rate = annualRate / 1200;
  const monthlyPayment = principal * rate / (1 - (1 + rate) ** -months);
  return Math.max(0, monthlyPayment * months - principal);
}

function selectDrive(suffix) {
  const drive = document.getElementById(`drive-${suffix}`).value;
  const profile = energyProfiles[drive];
  document.getElementById(`consumption-${suffix}`).value = profile.consumption;
  document.getElementById(`energy-price-${suffix}`).value = profile.energyPrice;
  document.getElementById(`consumption-label-${suffix}`).textContent = profile.consumptionLabel;
  document.getElementById(`consumption-unit-${suffix}`).textContent = profile.consumptionUnit;
  document.getElementById(`energy-price-label-${suffix}`).textContent = profile.priceLabel;
  document.getElementById(`energy-price-unit-${suffix}`).textContent = profile.priceUnit;
  calculateComparison();
}

function scenario(suffix, years, distance) {
  const startValue = value(`start-${suffix}`);
  const endValue = value(`end-${suffix}`);
  const annualEnergy = distance * value(`consumption-${suffix}`) / 100 * value(`energy-price-${suffix}`);
  const annualFixed = value(`insurance-${suffix}`) + value(`tax-${suffix}`) + value(`maintenance-${suffix}`);
  const financing = interestCost(Math.max(0, startValue - value(`down-${suffix}`)), value(`interest-${suffix}`), years * 12);
  const depreciation = startValue - endValue;
  const costs = {
    depreciation,
    energy: annualEnergy * years,
    fixed: annualFixed * years,
    financing,
  };
  return {
    name: document.getElementById(`name-${suffix}`).value.trim() || `Fahrzeug ${suffix.toUpperCase()}`,
    drive: document.getElementById(`drive-${suffix}`).value,
    costs,
    total: Object.values(costs).reduce((sum, amount) => sum + amount, 0),
  };
}

function renderScenario(suffix, result, years, distance) {
  const totalDistance = years * distance;
  document.getElementById(`result-name-${suffix}`).textContent = result.name;
  document.getElementById(`total-${suffix}`).textContent = money.format(result.total);
  document.getElementById(`monthly-${suffix}`).textContent = money.format(result.total / (years * 12));
  document.getElementById(`perkm-${suffix}`).textContent = moneyPrecise.format(totalDistance > 0 ? result.total / totalDistance : 0);

  const energyName = result.drive === "elektro" ? "Strom" : "Kraftstoff";
  const rows = [
    ["Wertverlust", result.costs.depreciation],
    [energyName, result.costs.energy],
    ["Versicherung, Steuer & Wartung", result.costs.fixed],
    ["Finanzierungszinsen", result.costs.financing],
  ];
  const breakdown = document.getElementById(`breakdown-${suffix}`);
  breakdown.replaceChildren(...rows.map(([label, amount]) => {
    const row = document.createElement("div");
    row.className = "comparison-breakdown-row";
    const name = document.createElement("span");
    name.textContent = label;
    const cost = document.createElement("strong");
    cost.textContent = money.format(amount);
    row.append(name, cost);
    return row;
  }));
}

function calculateComparison() {
  const years = value("compare-years");
  const distance = value("compare-distance");
  const numericIds = [
    "start-a", "end-a", "consumption-a", "energy-price-a", "insurance-a", "tax-a", "maintenance-a", "down-a", "interest-a",
    "start-b", "end-b", "consumption-b", "energy-price-b", "insurance-b", "tax-b", "maintenance-b", "down-b", "interest-b",
  ];
  if (!Number.isFinite(years) || !Number.isFinite(distance) || !numericIds.every((id) => Number.isFinite(value(id)))) return;

  const a = scenario("a", years, distance);
  const b = scenario("b", years, distance);
  const gap = Math.abs(a.total - b.total);
  document.getElementById("comparison-period").textContent = `über ${years} Jahre`;
  document.getElementById("comparison-summary").textContent = `Bei ${new Intl.NumberFormat("de-DE").format(distance)} km pro Jahr liegen die geschätzten Gesamtkosten ${money.format(gap)} auseinander.`;

  const cardA = document.getElementById("result-card-a");
  const cardB = document.getElementById("result-card-b");
  cardA.classList.remove("is-cheaper");
  cardB.classList.remove("is-cheaper");
  if (Math.abs(a.total - b.total) < 1) {
    document.getElementById("comparison-winner").textContent = "Beide Szenarien liegen fast gleichauf.";
  } else if (a.total < b.total) {
    document.getElementById("comparison-winner").textContent = `${a.name} ist nach deinen Angaben günstiger.`;
    cardA.classList.add("is-cheaper");
  } else {
    document.getElementById("comparison-winner").textContent = `${b.name} ist nach deinen Angaben günstiger.`;
    cardB.classList.add("is-cheaper");
  }
  renderScenario("a", a, years, distance);
  renderScenario("b", b, years, distance);
}

document.getElementById("drive-a").addEventListener("change", () => selectDrive("a"));
document.getElementById("drive-b").addEventListener("change", () => selectDrive("b"));
compareForm.addEventListener("input", calculateComparison);
compareForm.addEventListener("change", calculateComparison);
compareForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!compareForm.reportValidity()) return;
  for (const suffix of ["a", "b"]) {
    const downPayment = document.getElementById(`down-${suffix}`);
    downPayment.setCustomValidity("");
    if (Number(downPayment.value) > value(`start-${suffix}`)) {
      downPayment.setCustomValidity("Die Anzahlung darf nicht höher als der Wert heute oder Kaufpreis sein.");
      downPayment.reportValidity();
      downPayment.setCustomValidity("");
      return;
    }
  }
  calculateComparison();
  document.getElementById("compare-output").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

calculateComparison();
