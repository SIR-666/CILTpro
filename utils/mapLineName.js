export function mapLineName(line) {
  const mapping = {
    "Line A": "LINE A",
    "Line B": "LINE B",
    "Line C": "LINE C",
    "Line D": "LINE D",
    "Line E": "LINE E",
    "Line F": "LINE F",
    "Line G": "LINE G",
    "Flex 1": "FLEX 1",
    "Flex 2": "FLEX 2",
    "GEA 3": "GEA 3",
    "GEA 4": "GEA 4",
    "GEA 5": "GEA 5",
    YA: "YA",
    YB: "YB",
    YRTD: "YC",
    PASTEURIZER: "PASTEURIZER",
    "MOZ 200": "MOZZA 200",
    "MOZ 1000": "MOZZA 1000",
    RICO: "RICOTTA 250",
  };

  return mapping[line] || line; // fallback: return original if not mapped
}
