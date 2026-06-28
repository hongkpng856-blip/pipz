import { getSpeciesIndex, generatePixelPet } from './packages/core/dist/index.js';

for (let s = 1; s <= 200; s++) {
  const idx = getSpeciesIndex(s);
  if (idx === 0) {
    const pet = generatePixelPet({seed: s, rarity: 'rare', evolutionStage: 2});
    console.log('CAT SEED:', s, 'species:', pet.speciesName);
    break;
  }
}
for (let s = 1; s <= 10; s++) {
  const idx = getSpeciesIndex(s);
  const pet = generatePixelPet({seed: s, rarity: 'rare', evolutionStage: 2});
  console.log('Seed', s, '-> species', idx, pet.speciesName);
}
