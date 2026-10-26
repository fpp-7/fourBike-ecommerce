export const defaultVehicle = 'motorcycle';

// Electricity reference and assumptions are documented in docs/CALCULATIONS.md.
export const simulationDefaults = Object.freeze({
  monthlyDistance: 600,
  petrolPrice: 6.36,
  electricityPrice: 1.01226,
  batteryEnergy: 1,
  electricRange: 40
});

export const vehicleProfiles = Object.freeze({
  car: Object.freeze({
    efficiency: 10,
    label: 'Carro a gasolina',
    possessive: 'seu carro',
    reference: 'Carro a gasolina: estimativa de 10 km/l, sem modelo específico. Ajuste o consumo para o seu carro.'
  }),
  motorcycle: Object.freeze({
    efficiency: 48.6,
    label: 'Honda CG 160 Fan',
    possessive: 'sua moto',
    reference: 'Referência: Honda CG 160 Fan, 48,6 km/l de gasolina em teste publicado em 2018. O consumo real varia com o uso e a versão.'
  })
});
