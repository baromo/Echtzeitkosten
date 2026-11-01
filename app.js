const form = document.querySelector("#cost-form");
const driveButtons = [...document.querySelectorAll(".drive-option")];
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eurPrecise = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const driveProfiles = {
  benziner: { consumption: 7, energyPrice: 1.8, consumptionUnit: "l / 100 km", priceLabel: "Preis je Liter", priceUnit: "€ / l" },
  diesel: { consumption: 5.5, energyPrice: 1.7, consumptionUnit: "l / 100 km", priceLabel: "Preis je Liter", priceUnit: "€ / l" },
  elektro: { consumption: 18, energyPrice: 0.32, consumptionUnit: "kWh / 100 km", priceLabel: "Preis je kWh", priceUnit: "€ / kWh" },
};

function getNumber(id) {
  return Number(document.getElementById(id).value);
}

function setDrive(drive) {
  const profile = driveProfiles[drive];
  document.getElementById("drive").value = drive;
  document.getElementById("consumption").value = profile.consumption;
  document.getElementById("energy-price").value = profile.energyPrice;
  document.getElementById("consumption-unit").textContent = profile.consumptionUnit;
  document.getElementById("energy-price-label").textContent = profile.priceLabel;
  document.getElementById("energy-price-unit").textContent = profile.priceUnit;

  driveButtons.forEach((button) => {
    const selected = button.dataset.drive === drive;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  calculate();
}

function loanInterest(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return 0;
  const monthlyPayment = principal * monthlyRate / (1 - (1 + monthlyRate) ** -months);
  return Math.max(0, monthlyPayment * months - principal);
}

function calculate() {
  const purchasePrice = getNumber("price");
  const downPayment = getNumber("down-payment");
  const years = getNumber("years");
  const kilometresPerYear = getNumber("distance");
  const consumption = getNumber("consumption");
  const energyPrice = getNumber("energy-price");
  const insurance = getNumber("insurance");
  const tax = getNumber("tax");
  const maintenance = getNumber("maintenance");
  const resale = getNumber("resale");
  const annualRate = getNumber("interest");

  if (![purchasePrice, downPayment, years, kilometresPerYear, consumption, energyPrice, insurance, tax, maintenance, resale, annualRate].every(Number.isFinite)) return;

  const annualEnergy = kilometresPerYear * consumption / 100 * energyPrice;
  const annualFixed = insurance + tax + maintenance;
  const depreciation = purchasePrice - resale;
  const interest = loanInterest(Math.max(0, purchasePrice - downPayment), annualRate, years * 12);
  const total = depreciation + interest + (annualEnergy + annualFixed) * years;
  const monthly = total / (years * 12);
  const perDay = total / (years * 365.25);
  const totalDistance = kilometresPerYear * years;
  const perKilometre = totalDistance > 0 ? total / totalDistance : 0;

  document.getElementById("result-period").textContent = `auf ${years} Jahre`;
  document.getElementById("monthly-cost").textContent = eur.format(monthly);
  document.getElementById("daily-cost").textContent = eurPrecise.format(perDay);
  document.getElementById("per-km-cost").textContent = eurPrecise.format(perKilometre);
  document.getElementById("total-cost").textContent = `${eur.format(total)} gesamt`;

  const rows = [
    ["Wertverlust", depreciation],
    [document.getElementById("drive").value === "elektro" ? "Strom" : "Kraftstoff", annualEnergy * years],
    ["Versicherung, Steuer & Wartung", annualFixed * years],
    ["Zinsen", interest],
  ];
  document.querySelectorAll("#breakdown .breakdown-row").forEach((row, index) => {
    row.querySelector(".breakdown-name").lastChild.textContent = rows[index][0];
    row.querySelector("strong").textContent = eur.format(rows[index][1]);
  });
}

driveButtons.forEach((button) => {
  button.addEventListener("click", () => setDrive(button.dataset.drive));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (getNumber("down-payment") > getNumber("price")) {
    document.getElementById("down-payment").setCustomValidity("Die Anzahlung darf nicht höher als der Kaufpreis sein.");
    document.getElementById("down-payment").reportValidity();
    document.getElementById("down-payment").setCustomValidity("");
    return;
  }
  calculate();
  document.getElementById("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

form.addEventListener("input", (event) => {
  if (event.target.id === "down-payment") event.target.setCustomValidity("");
  calculate();
});
form.addEventListener("change", calculate);

calculate();
