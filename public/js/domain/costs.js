/** Calculate fuel and charging costs from explicit values, without rounding. */
export function calculateRunningCosts({
  monthlyDistance,
  petrolPrice,
  petrolEfficiency,
  electricityPrice,
  batteryEnergy,
  electricRange
} = {}) {
  const nonNegative = { monthlyDistance, petrolPrice, electricityPrice };
  const positive = { petrolEfficiency, batteryEnergy, electricRange };

  for (const [name, value] of Object.entries(nonNegative)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a finite number greater than or equal to zero.`);
    }
  }
  for (const [name, value] of Object.entries(positive)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a finite number greater than zero.`);
    }
  }

  const energyPerCharge = batteryEnergy;
  const petrolPerKm = petrolPrice / petrolEfficiency;
  const electricPerKm = energyPerCharge * electricityPrice / electricRange;
  const petrolMonthly = monthlyDistance * petrolPerKm;
  const electricMonthly = monthlyDistance * electricPerKm;
  const difference = petrolMonthly - electricMonthly;
  const outcome = Math.abs(difference) < 0.005 ? 'equal' : difference > 0 ? 'saving' : 'higher';
  const shownDifference = outcome === 'equal' ? 0 : Math.abs(difference);
  const maximum = Math.max(petrolMonthly, electricMonthly);

  return {
    energyPerCharge,
    petrolPerKm,
    electricPerKm,
    petrolMonthly,
    electricMonthly,
    difference,
    outcome,
    shownDifference,
    annualDifference: shownDifference * 12,
    percentage: petrolMonthly > 0 ? Math.abs(difference) / petrolMonthly * 100 : null,
    petrolBarPercent: maximum ? petrolMonthly / maximum * 100 : 0,
    electricBarPercent: maximum ? electricMonthly / maximum * 100 : 0
  };
}
