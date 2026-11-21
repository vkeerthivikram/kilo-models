// Keep established single-segment URLs for ordinary model IDs. Literal escapes
// and dot segments use a separate route so Next or the browser cannot reinterpret them.
const ordinaryId = /^[\w./~-]+$/u;

function encodeExactModelId(id: string): string {
  return encodeURIComponent(id).replace(/[.!'()*~]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`).replaceAll("%", "~");
}

export function modelDetailPath(id: string): string {
  if (ordinaryId.test(id) && id !== "." && id !== "..") return `/models/${encodeURIComponent(id)}`;
  return `/models/id/${encodeExactModelId(id)}`;
}

export function decodeExactModelId(segment: string): string | null {
  try {
    const id = decodeURIComponent(segment.replaceAll("~", "%"));
    return id.trim() && encodeExactModelId(id) === segment ? id : null;
  } catch {
    return null;
  }
}
