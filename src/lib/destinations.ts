export type Destination = {
  id: string;
  name: string;
  gravity: number; // × Earth; real planets are refreshed from the planets table at request time
  color: string;
  blurb: string; // shown on the destination button
  look: string; // fed to the image prompt
  fictional?: boolean;
};

export const DESTINATIONS: Destination[] = [
  { id: "mercury", name: "Mercury", gravity: 0.38, color: "#b8b2a7",
    blurb: "Scorching days, freezing nights, no air.",
    look: "a scorched grey cratered plain under a black sky, an enormous blinding Sun filling the horizon" },
  { id: "venus", name: "Venus", gravity: 0.91, color: "#e8cf9a",
    blurb: "Hot enough to melt lead, under acid clouds.",
    look: "a glowing volcanic plain under thick yellow-orange sulfuric clouds, heavy orange haze, everything slightly melting" },
  { id: "earth", name: "Earth", gravity: 1, color: "#6fa8dc",
    blurb: "Earth, as the aliens imagine it.",
    look: "Earth as imagined by an alien who has only seen postcards: oversaturated colors, slightly wrong proportions, too many pigeons" },
  { id: "mars", name: "Mars", gravity: 0.38, color: "#d7735a",
    blurb: "Red dust everywhere. Two tiny moons.",
    look: "a rust-red dusty desert under a pale butterscotch sky, a small distant Sun, two tiny moons, low-gravity dust drifting" },
  { id: "jupiter", name: "Jupiter", gravity: 2.53, color: "#d9b38c",
    blurb: "No ground, crushing gravity, a giant storm.",
    look: "floating among swirling orange and cream cloud bands, the Great Red Spot looming enormous in the sky, everything squashed by heavy gravity" },
  { id: "saturn", name: "Saturn", gravity: 1.06, color: "#e9c46a",
    blurb: "The rings fill the whole sky.",
    look: "a pale golden haze with Saturn's gigantic rings arching across the entire sky, glittering ice particles drifting" },
  { id: "uranus", name: "Uranus", gravity: 0.92, color: "#9fd9d9",
    blurb: "Tipped on its side. Smells like rotten eggs.",
    look: "pale cyan icy fog, faint vertical rings, the whole horizon tilted sideways, frost on everything" },
  { id: "neptune", name: "Neptune", gravity: 1.19, color: "#6d8fe0",
    blurb: "Deep blue, freezing, the fastest winds.",
    look: "a deep cobalt-blue frozen world, supersonic winds whipping white methane clouds, a dark storm spiral overhead" },
  { id: "xylo-7", name: "Xylo-7", gravity: 0.7, color: "#c08cff", fictional: true,
    blurb: "The aliens' homeworld. They'd love a visit.",
    look: "the alien homeworld: bioluminescent purple jungles, three suns of different colors, floating crystal towers, curious tentacled locals" },
];

export function getDestination(id: unknown): Destination | null {
  return DESTINATIONS.find((d) => d.id === id) ?? null;
}
