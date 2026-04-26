/* Planet lore — maps solar-system bodies to projects/experience entries in DetailPage.
   Each entry holds display metadata shown when a planet is orbit-locked.
   Order must stay in sync with SOLAR_PLANETS in useThreeScene.js (index-matched). */

export const PLANET_LORE = [
  { name: 'Mercury', symbol: '\u263F', rgb: [154, 143, 125],
    facts: ['1st · closest to the Sun', 'Rocky, gray, heavily cratered', 'Exosphere: O₂ Na H₂ He', 'Surface: −180°C to 430°C', '88-day orbit'] },
  { name: 'Venus',   symbol: '\u2640', rgb: [232, 194, 138],
    facts: ['2nd planet · rocky terrestrial', 'Dense CO₂ atmosphere (90 atm)', 'Hottest planet · avg 465°C', 'Retrograde slow rotation', '225-day year'] },
  { name: 'Earth',   symbol: '♁',     rgb: [ 70, 130, 180],
    facts: ['3rd · the Blue Planet', 'Only known life-bearing world', 'Liquid water ocean covers 71%', '23.5° axial tilt · seasons', '365.25-day year'] },
  { name: 'Mars',    symbol: '\u2642', rgb: [200, 107,  60],
    facts: ['4th · the Red Planet', 'Iron oxide + polar ice caps', 'Thin CO₂ atmosphere', 'Olympus Mons: tallest known volcano', '687-day year'] },
  { name: 'Jupiter', symbol: '\u2643', rgb: [217, 181, 143],
    facts: ['5th · largest gas giant', 'Great Red Spot: 350-year storm', '95 known moons (Io, Europa…)', 'Strongest magnetic field', '12-year orbit'] },
  { name: 'Saturn',  symbol: '\u2644', rgb: [230, 200, 136],
    facts: ['6th · iconic ring system', 'Rings: 99% water ice', 'Least dense planet', '146 known moons', '29-year orbit'] },
  { name: 'Uranus',  symbol: '\u26E2', rgb: [154, 219, 230],
    facts: ['7th · ice giant', '98° axial tilt — orbits on its side', 'Methane haze → blue-green hue', '28 known moons', '84-year orbit'] },
  { name: 'Neptune', symbol: '\u2646', rgb: [ 74, 127, 217],
    facts: ['8th · farthest from the Sun', 'Strongest winds: 2,100 km/h', 'Largest moon: Triton (retrograde)', 'Avg surface: −214°C', '165-year orbit'] },
];
