import { calculateRunningCosts } from './domain/costs.js';
import { simulationDefaults, vehicleProfiles, defaultVehicle } from './data/simulation.js';

const calculator = document.querySelector('#savings-calculator');
const distance = document.querySelector('#monthly-distance');
const inputs = {
  petrolPrice: document.querySelector('#petrol-price'),
  petrolEfficiency: document.querySelector('#petrol-efficiency'),
  electricityPrice: document.querySelector('#electricity-price'),
  batteryEnergy: document.querySelector('#battery-energy'),
  electricRange: document.querySelector('#electric-range')
};
const currency = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits:2 });
const energyPrice = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2, maximumFractionDigits:5 });
const money = value => currency.format(value);
const setText = (id, value) => { document.getElementById(id).textContent = value; };
const vehicleOptions = [...calculator.querySelectorAll('input[name="vehicle-type"]')];
const vehicleState = Object.fromEntries(Object.entries(vehicleProfiles).map(([type, profile]) => [type, { value:String(profile.efficiency), custom:false }]));
let activeVehicle = defaultVehicle;
for (const option of vehicleOptions) option.checked = option.value === activeVehicle;
distance.defaultValue = String(simulationDefaults.monthlyDistance);
distance.value = distance.defaultValue;
for (const [key, input] of Object.entries(inputs)) {
  input.defaultValue = String(key === 'petrolEfficiency' ? vehicleProfiles[defaultVehicle].efficiency : simulationDefaults[key]);
  input.value = input.defaultValue;
}
let announcement;
let customElectricity = false;

function updateVehicleReference() {
  const profile = vehicleProfiles[activeVehicle];
  const input = inputs.petrolEfficiency;
  const valid = input.validity.valid && Number.isFinite(input.valueAsNumber);
  const custom = vehicleState[activeVehicle].custom;
  const label = activeVehicle === 'car' ? 'Carro a gasolina' : 'Moto a gasolina';
  setText('petrol-efficiency-label', `Consumo ${activeVehicle === 'car' ? 'do seu carro' : 'da sua moto'} (km/l)`);
  setText('petrol-vehicle-label', custom || !valid ? label : profile.label);
  setText('vehicle-reference-text', !valid ? `Informe o consumo ${activeVehicle === 'car' ? 'do seu carro' : 'da sua moto'} em km/l para comparar.` : custom ? `Consumo informado por você: ${number.format(input.valueAsNumber)} km/l para ${profile.possessive}. A conta usa esse valor, sem atribuí-lo a um teste ou fabricante.` : profile.reference);
  document.querySelector('#vehicle-reference-source').hidden = activeVehicle !== 'motorcycle' || custom || !valid;
}

function updateEstimate(announce = true) {
  updateVehicleReference();
  const electricityValid = inputs.electricityPrice.validity.valid && Number.isFinite(inputs.electricityPrice.valueAsNumber);
  setText('electricity-reference-text', !electricityValid ? 'Informe um valor válido de energia com tributos em R$/kWh para comparar.' : customElectricity ? `Energia informada por você: ${energyPrice.format(inputs.electricityPrice.valueAsNumber)}/kWh com tributos. A conta usa esse valor, sem atribuí-lo à Enel São Paulo.` : `Energia: Enel São Paulo, residencial convencional, base vigente desde 04/07/2026. ${energyPrice.format(inputs.electricityPrice.valueAsNumber)}/kWh estimados com tributos; veja as premissas em “Ajustar valores”.`);
  document.querySelector('#electricity-reference-source').hidden = customElectricity || !electricityValid;
  const km = distance.valueAsNumber;
  setText('distance-value', `${number.format(km)} km`);
  distance.setAttribute('aria-valuetext', `${number.format(km)} quilômetros por mês`);
  const values = {};
  let valid = true;
  for (const [key, input] of Object.entries(inputs)) {
    const inputValid = input.validity.valid && Number.isFinite(input.valueAsNumber);
    input.setAttribute('aria-invalid', String(!inputValid));
    values[key] = input.valueAsNumber;
    valid = valid && inputValid;
  }
  const error = document.querySelector('#savings-error');
  error.hidden = valid;
  clearTimeout(announcement);
  if (!valid) {
    for (const id of ['petrol-monthly','electric-monthly','savings-monthly','savings-yearly']) setText(id, '—');
    for (const id of ['petrol-per-km','electric-per-km','savings-percentage','savings-formula']) setText(id, '');
    setText('savings-result-label', 'Preencha os valores para comparar');
    document.querySelector('#savings-difference').dataset.outcome = 'invalid';
    for (const id of ['petrol-bar','electric-bar']) document.getElementById(id).style.width = '0%';
    if (announce) announcement = setTimeout(() => setText('savings-live', error.textContent), 250);
    return;
  }

  const { energyPerCharge, petrolPerKm, electricPerKm, petrolMonthly, electricMonthly, outcome, shownDifference, annualDifference, percentage, petrolBarPercent, electricBarPercent } = calculateRunningCosts({ monthlyDistance:km, ...values });

  setText('petrol-monthly', money(petrolMonthly));
  setText('electric-monthly', money(electricMonthly));
  setText('petrol-per-km', `${money(petrolPerKm)} por km`);
  setText('electric-per-km', `${money(electricPerKm)} por km`);
  document.querySelector('#petrol-bar').style.width = `${petrolBarPercent}%`;
  document.querySelector('#electric-bar').style.width = `${electricBarPercent}%`;
  document.querySelector('#savings-difference').dataset.outcome = outcome;
  const label = outcome === 'saving' ? 'Economia anual estimada em recarga' : outcome === 'higher' ? 'Custo anual adicional de recarga' : 'Mesmo gasto neste cenário';
  setText('savings-result-label', label);
  setText('savings-monthly', money(shownDifference));
  setText('savings-yearly', money(annualDifference));
  setText('savings-percentage', outcome !== 'equal' && percentage !== null ? `${number.format(percentage)}% ${outcome === 'saving' ? 'menos' : 'mais'} no gasto com energia deste cenário.` : '');
  setText('savings-formula', `A conta: ${number.format(energyPerCharge)} kWh por carga × ${energyPrice.format(values.electricityPrice)}/kWh = ${money(energyPerCharge * values.electricityPrice)} para percorrer ${number.format(values.electricRange)} km. Gasolina: distância ÷ ${number.format(values.petrolEfficiency)} km/l × ${money(values.petrolPrice)}/litro. O resultado considera os valores sem arredondamento.`);
  if (announce) announcement = setTimeout(() => setText('savings-live', `${document.querySelector('#petrol-vehicle-label').textContent}, ${number.format(values.petrolEfficiency)} quilômetros por litro. ${number.format(km)} quilômetros por mês. Gasolina: ${money(petrolMonthly)}. Recarga: ${money(electricMonthly)}. ${label}: ${money(annualDifference)} em 12 meses, equivalente a ${money(shownDifference)} por mês.`), 250);
}

calculator.addEventListener('input', event => {
  if (event.target.matches('input[name="vehicle-type"]')) return;
  if (event.target === inputs.petrolEfficiency) {
    vehicleState[activeVehicle].value = inputs.petrolEfficiency.value;
    vehicleState[activeVehicle].custom = true;
  }
  if (event.target === inputs.electricityPrice) customElectricity = true;
  updateEstimate();
});
for (const option of vehicleOptions) option.addEventListener('change', () => {
  if (!option.checked) return;
  activeVehicle = option.value;
  inputs.petrolEfficiency.value = vehicleState[activeVehicle].value;
  updateEstimate();
});
document.querySelector('#savings-reset').addEventListener('click', () => {
  distance.value = distance.defaultValue;
  for (const input of Object.values(inputs)) input.value = input.defaultValue;
  customElectricity = false;
  for (const [type, profile] of Object.entries(vehicleProfiles)) {
    vehicleState[type].value = String(profile.efficiency);
    vehicleState[type].custom = false;
  }
  activeVehicle = defaultVehicle;
  for (const option of vehicleOptions) option.checked = option.value === activeVehicle;
  updateEstimate();
});
updateEstimate(false);
calculator.hidden = false;
